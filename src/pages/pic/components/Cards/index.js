import React, { Component } from "react";
import { Checkbox, Card, Pagination, Modal, message, Tooltip } from "antd"
import { ReloadOutlined } from "@ant-design/icons"
import { getLocalPic, setLocalPic } from "@/utils/picture"
import { getLogs } from "@/services/log"
import styles from "./index.less"
const { Meta } = Card

export default class MyCard extends React.Component {

    timer = ""
    state = {
        page: 1,
        pageSize: 10,
        visible: false,
        //放大的视图
        src: "",
        name: "",
        id: "",
        //日志列表
        data: []
    }
    //已经发送过命令的ID列表
    hasGetList = []

    handleCheck = (e, id) => {
        const { onChecked, devices } = this.props
        devices.forEach(v => {
            if (v.id == id) {
                v.checked = e.target.checked
            }
        })
        //深拷贝回调
        onChecked(JSON.parse(JSON.stringify(devices)))
    }

    // handlePage = (page, pageSize) => {
    //     this.setState({
    //         page, pageSize
    //     })
    //     this.sendData({ type: "getPic", data: devices.slice((page - 1) * pageSize, page * pageSize).map(v => v.id) })
    // }

    sendData = (data, dis) => {
        const { sendFunc } = this.props
        sendFunc(data, dis)
    }

    handleAmplification = (value) => {
        if (getLocalPic(value.id)) {
            this.setState({ visible: true, ...value, src: getLocalPic(value.id) }, () => {
                this.getLogs(value.id, 10)
            })

        } else {
            message.error("没有可以预览的截图！")
        }
    }

    refresh = (e, id) => {
        e.stopPropagation()
        this.getPic(id)
    }


    componentDidMount() {
        this.timer = setInterval(() => {
            const { devices } = this.props
            if (devices.length) {
                for (let i = 0; i < devices.length; i++) {
                    if (devices[i].src == undefined) {
                        //是否已经发送过命令
                        if (this.hasGetList.indexOf(devices[i].id) == -1) {
                            this.hasGetList.push(devices[i].id)
                            this.getPic(devices[i].id)
                            break;
                        }
                    }
                }
            }
        }, 200)
    }

    componentWillUnmount() {
        this.timer && clearInterval(this.timer)
    }

    getPic = (id) => {
        this.sendData({ codeType: "device", cmd: "getSnapshot" }, { group: "phone", id: id })
    }

    getLogs = (id, limit) => {
        const { visible } = this.state
        if (!visible) return
        getLogs(id, limit).then(res => {
            console.log("Res", res)
            if (res.succes) {
                this.setState({ data: res.data })
            }
        })
    }


    render() {
        const { devices } = this.props
        const { page, pageSize, src, name, id, visible, data } = this.state
        return (
            <div className={styles.cardContainer}>
                <div className={styles.cards}>
                    {
                        devices.map(value => {
                            return <Card key={value.id}
                                style={{ width: 165, marginTop: "0.3rem", marginLeft: "0.3rem", marginRight: "0.3rem" }}
                                cover={
                                    <div onClick={() => { this.handleAmplification(value) }}>
                                        <ReloadOutlined className={styles.icon} onClick={(e) => this.refresh(e, value.id)} />
                                        {getLocalPic(value.id) ? <img
                                            style={{ width: 160, height: 280 }}
                                            alt="屏幕截图"
                                            src={getLocalPic(value.id)}
                                        /> : <div style={{ width: 160, height: 280, display: "flex", justifyContent: "center", alignItems: "center" }}>
                                                未获取截图
                                            </div>
                                        }
                                    </div>
                                }>
                                <Meta
                                    title={<Checkbox checked={value.checked} onClick={(e) => { this.handleCheck(e, value.id) }}>{value.name}</Checkbox>}
                                    description={<Tooltip title={value.data ? value.data.retMsg : ""}>
                                        <span>{value.data ? value.data.retMsg : ""}</span>
                                    </Tooltip>

                                    }
                                />
                            </Card>
                        })
                    }
                </div>
                {/* <Pagination defaultCurrent={1} total={devices.length} onChange={this.handlePage} /> */}
                <Modal
                    title={name}
                    visible={visible}
                    onCancel={() => { this.setState({ visible: false }) }}
                    footer={null}
                    width={'800px'}
                >
                    <div className={styles.modalContainer}>
                        <img src={src} style={{ width: "320px",height:"560px" }}></img>
                        <ul style={{ width: "auto",height:"560px" ,overflow:"auto"}}>
                            {data && data.length ? data.map((v) => {
                                return <li>{v.data}</li>
                            }) : null}
                        </ul>
                    </div>

                </Modal>
            </div>
        );
    }
}