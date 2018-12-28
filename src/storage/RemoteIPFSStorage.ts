/*
 * Copyright 2018 Menlo One, Inc.
 * Copyright 2018 Vulcanize, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the “License”);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an “AS IS” BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import ipfsAPI from 'ipfs-api'
import { CID, IPFSFile } from 'ipfs'
import PromiseRaceSuccess from '../utils/PromiseRaceSuccess'
import { IIPFSMessage, IIPFSTopic } from '../ContentNode/BlockOverflow.cto'

export class IPFSTopic implements IIPFSTopic {
    version: number = 1
    offset:  number = -1
    author:  string = ''
    date:    number = 0
    title:   string = ''
    body:    string = ''
}

export class IPFSMessage implements IIPFSMessage {
    version: number = 1
    offset:  number = -1
    topic:   number = 0
    parent:  CID    = ''
    author:  string = ''
    date:    number = 0
    body:    string = ''
}

class RemoteIPFSStorage {

    private readonly ipfs      : ipfs
    private readonly ipfsMenlo : ipfs

    constructor() {
        this.ipfs      = ipfsAPI('ipfs.infura.io', '5001', {protocol: 'https'})
        this.ipfsMenlo = ipfsAPI('ipfs.menlo.one', '4002', { protocol: 'https' })
    }

    async createMessage(message : IPFSMessage) : Promise<CID> {
        const file = {
            path: `/${message.topic}/${message.offset}.json`,
            content: Buffer.from(JSON.stringify(message))
        }
        const result = await new PromiseRaceSuccess().timeout({ ms: 5000, error:`Error GETing IPFS ${file}` }, [
            this.ipfs.files.add([file], { pin: true }),
            this.ipfsMenlo.files.add([file], { pin: true }),
        ])
        const hash = result[0].hash

        /*
        console.log(`Created ${hash}`)

        const list = await this.ipfs.pin.ls()
        console.log(list.filter(l => l.hash === hash))

        const add = await this.ipfs.pin.add(hash)

        const list2 = await this.ipfs.pin.ls()
        console.log(list.filter(l => l.hash === hash))

        Test
        const hashSolidity = HashUtils.cidToSolidityHash(hash)
        const ipfsHash = HashUtils.solidityHashToCid(hashSolidity)

        let files = await this.ipfs.files.get(ipfsHash)
        let ipfsMessage = JSON.parse(files[0].content.toString('utf8'))
        console.log(`Stored ${ipfsMessage}`)
         */

        return hash
    }

    async createTopic(topic : IPFSTopic) : Promise<CID> {
        const file = {
            path: `/${topic.offset}/Topic.json`,
            content: Buffer.from(JSON.stringify(topic))
        }
        const result = await new PromiseRaceSuccess().timeout({ ms:5000, error: `Error GETing file ${file}`}, [
            this.ipfs.files.add([file], { pin: true }),
            this.ipfsMenlo.files.add([file], { pin: true }),
        ])
        const hash = result[0].hash

        /*
        console.log(`Created ${hash}`)

        const list = await this.ipfs.pin.ls()
        console.log(list.filter(l => l.hash === hash))

        const add = await this.ipfs.pin.add(hash)

        const list2 = await this.ipfs.pin.ls()
        console.log(list.filter(l => l.hash === hash))

        Test
        const hashSolidity = HashUtils.cidToSolidityHash(hash)
        const ipfsHash = HashUtils.solidityHashToCid(hashSolidity)

        let files = await this.ipfs.files.get(ipfsHash)
        let ipfsMessage = JSON.parse(files[0].content.toString('utf8'))
        console.log(`Stored ${ipfsMessage}`)
         */

        return hash
    }

    async getMessage<T>(hash : CID) : Promise<T> {
        let tries = 2
        let files : IPFSFile[] | null = null

        console.log(`GETTING ${hash}`)

        do {

            try {
                files = await new PromiseRaceSuccess().timeout({ ms: 10000, error:`Error GETting IPFS ${hash}` }, [
                    this.ipfs.files.get(hash),
                    this.ipfsMenlo.files.get(hash),
                ])
            } catch (e) {
                console.error('IPFS GET Error: ', e)

                if (tries-- === 0) {
                    throw (e)
                }
            }
        } while (!files)

        let json
        try {
            json = JSON.parse(files![0].content!.toString())
        } catch (e) {
            console.log('Error parsing IPFS JSON', e)
            throw (e)
        }

        console.log(`IPFS GOT ${hash}`)


        return json
    }

    async pin(hash : CID) {
        await (this.ipfs as any).pin.add(hash)
    }

    async unpin(hash : CID) {
        console.log(`Unpinning ${hash}`)
        await (this.ipfs as any).pin.rm(hash)
    }
}

export default RemoteIPFSStorage
